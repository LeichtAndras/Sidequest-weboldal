// Kivagas keszitese a macOS Vision keretrendszerevel: ugyanaz a fo alak
// leemeles, mint a Fotok appban.  Hasznalat:  swift kivagas.swift be.jpg ki.png
import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count >= 3 else {
  FileHandle.standardError.write("hasznalat: kivagas.swift <be> <ki>\n".data(using: .utf8)!)
  exit(64)
}
let be = URL(fileURLWithPath: args[1])
let ki = URL(fileURLWithPath: args[2])
// Harmadik ervkent "mind": az osszes megtalalt alak egyben
let mindet = args.count > 3 && args[3] == "mind" 

guard let kep = CIImage(contentsOf: be, options: [.applyOrientationProperty: true]) else {
  FileHandle.standardError.write("nem olvashato: \(be.path)\n".data(using: .utf8)!)
  exit(65)
}

let kezelo = VNImageRequestHandler(url: be, options: [:])
let keres = VNGenerateForegroundInstanceMaskRequest()
try kezelo.perform([keres])

guard let eredmeny = keres.results?.first, !eredmeny.allInstances.isEmpty else {
  FileHandle.standardError.write("nem talalt fo alakot\n".data(using: .utf8)!)
  exit(66)
}

// Csak a legnagyobb alak kell, a mellette allo targyak nem
let ctxMeres = CIContext()
var legnagyobb = eredmeny.allInstances.first!
var legnagyobbTerulet = -1.0

for peldany in eredmeny.allInstances {
  let p = try eredmeny.generateScaledMaskForImage(forInstances: [peldany], from: kezelo)
  let m = CIImage(cvPixelBuffer: p)
  guard let atlagSzuro = CIFilter(name: "CIAreaAverage") else { continue }
  atlagSzuro.setValue(m, forKey: kCIInputImageKey)
  atlagSzuro.setValue(CIVector(cgRect: m.extent), forKey: kCIInputExtentKey)
  guard let ki = atlagSzuro.outputImage else { continue }
  var bajt = [UInt8](repeating: 0, count: 4)
  ctxMeres.render(ki, toBitmap: &bajt, rowBytes: 4, bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
                  format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
  let terulet = Double(bajt[0]) * Double(m.extent.width * m.extent.height)
  if terulet > legnagyobbTerulet {
    legnagyobbTerulet = terulet
    legnagyobb = peldany
  }
}

let puffer = try eredmeny.generateScaledMaskForImage(
  forInstances: mindet ? eredmeny.allInstances : [legnagyobb], from: kezelo)
let maszk = CIImage(cvPixelBuffer: puffer)

// A maszk meretere igazitjuk a kepet, majd a maszkot atlatszosagkent hasznaljuk
let arany = kep.extent.width / maszk.extent.width
let igazitott = maszk.transformed(by: CGAffineTransform(scaleX: arany, y: arany))

guard let szuro = CIFilter(name: "CIBlendWithMask") else { exit(67) }
szuro.setValue(kep, forKey: kCIInputImageKey)
szuro.setValue(igazitott, forKey: kCIInputMaskImageKey)
szuro.setValue(CIImage(color: .clear).cropped(to: kep.extent), forKey: kCIInputBackgroundImageKey)

guard let vege = szuro.outputImage else { exit(68) }
let ctx = CIContext()
try ctx.writePNGRepresentation(of: vege, to: ki, format: .RGBA8,
                               colorSpace: CGColorSpaceCreateDeviceRGB())
print("kesz: \(ki.lastPathComponent) \(Int(vege.extent.width))x\(Int(vege.extent.height)) talalt alakok: \(eredmeny.allInstances.count), a legnagyobbat hasznaltam")
