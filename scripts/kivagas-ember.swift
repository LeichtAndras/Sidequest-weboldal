// Csak embereket emel ki a kepbol, a mellettuk allo targyakat nem.
// Hasznalat:  swift kivagas-ember.swift be.jpg ki.png
import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count >= 3 else { exit(64) }
let be = URL(fileURLWithPath: args[1])
let ki = URL(fileURLWithPath: args[2])

guard let kep = CIImage(contentsOf: be, options: [.applyOrientationProperty: true]) else { exit(65) }

let kezelo = VNImageRequestHandler(url: be, options: [:])
let keres = VNGeneratePersonSegmentationRequest()
keres.qualityLevel = .accurate
keres.outputPixelFormat = kCVPixelFormatType_OneComponent8
try kezelo.perform([keres])

guard let eredmeny = keres.results?.first else { exit(66) }
let maszk = CIImage(cvPixelBuffer: eredmeny.pixelBuffer)
let arany = kep.extent.width / maszk.extent.width
let igazitott = maszk.transformed(by: CGAffineTransform(scaleX: arany, y: arany))

guard let szuro = CIFilter(name: "CIBlendWithMask") else { exit(67) }
szuro.setValue(kep, forKey: kCIInputImageKey)
szuro.setValue(igazitott, forKey: kCIInputMaskImageKey)
szuro.setValue(CIImage(color: .clear).cropped(to: kep.extent), forKey: kCIInputBackgroundImageKey)

guard let vege = szuro.outputImage else { exit(68) }
try CIContext().writePNGRepresentation(of: vege, to: ki, format: .RGBA8,
                                       colorSpace: CGColorSpaceCreateDeviceRGB())
print("kesz: \(ki.lastPathComponent) \(Int(vege.extent.width))x\(Int(vege.extent.height))")
