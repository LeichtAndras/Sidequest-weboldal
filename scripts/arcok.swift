// Arcok helye a kepen, keppontban.  Hasznalat: swift arcok.swift kep.jpg
import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count >= 2 else { exit(64) }
let be = URL(fileURLWithPath: args[1])
guard let kep = CIImage(contentsOf: be, options: [.applyOrientationProperty: true]) else { exit(65) }
let W = kep.extent.width, H = kep.extent.height

let kezelo = VNImageRequestHandler(url: be, options: [:])
let keres = VNDetectFaceRectanglesRequest()
try kezelo.perform([keres])

for (i, arc) in (keres.results ?? []).enumerated() {
  let d = arc.boundingBox // 0-1, alulrol szamolva
  let x = d.origin.x * W
  let y = (1 - d.origin.y - d.height) * H
  print("arc \(i): x \(Int(x))..\(Int(x + d.width * W))  y \(Int(y))..\(Int(y + d.height * H))")
}
if (keres.results ?? []).isEmpty { print("nincs arc") }
